#!/usr/bin/env bash
# Crea en Oracle Cloud todo lo que necesita Sanatorio 42: la red con los puertos
# web abiertos y la máquina, ya preparada con infra/oracle/cloud-init.yaml.
#
# Está pensado para pegarlo en Cloud Shell (la terminal de la consola de
# Oracle), que ya viene conectada a tu cuenta. Se puede lanzar más de una vez:
# lo que ya existe se reutiliza.
#
#   SSH_KEY='ssh-ed25519 AAAA… tu@correo' bash create-instance.sh
#
# Por defecto pide una máquina ARM gratuita (1 OCPU, 6 GB). Si Oracle responde
# "Out of host capacity", vuelve a intentarlo más tarde o usa la x86 pequeña:
#
#   SHAPE=VM.Standard.E2.1.Micro SSH_KEY='…' bash create-instance.sh
set -euo pipefail

: "${SSH_KEY:?Pon tu clave pública en SSH_KEY}"
C=${OCI_TENANCY:?Esto hay que lanzarlo en Cloud Shell}
NAME=${NAME:-sanatorio}
SHAPE=${SHAPE:-VM.Standard.A1.Flex}
REPO_RAW=${REPO_RAW:-https://raw.githubusercontent.com/ALRO-GM/sanatorio-42/main}

# `true` si una consulta de `oci` ha devuelto algo de verdad.
found() { [ -n "$1" ] && [ "$1" != "null" ] && [ "$1" != "None" ]; }
id_of() { "$@" --query 'data[0].id' --raw-output 2>/dev/null || true; }

echo "1/5 Red…"
VCN=$(id_of oci network vcn list -c "$C" --display-name "$NAME")
if ! found "$VCN"; then
  VCN=$(oci network vcn create -c "$C" --display-name "$NAME" --cidr-blocks '["10.0.0.0/16"]' \
    --dns-label sanatorio --wait-for-state AVAILABLE --query 'data.id' --raw-output)
fi

IGW=$(id_of oci network internet-gateway list -c "$C" --vcn-id "$VCN")
if ! found "$IGW"; then
  IGW=$(oci network internet-gateway create -c "$C" --vcn-id "$VCN" --is-enabled true \
    --display-name "$NAME" --wait-for-state AVAILABLE --query 'data.id' --raw-output)
fi

RT=$(oci network vcn get --vcn-id "$VCN" --query 'data."default-route-table-id"' --raw-output)
oci network route-table update --rt-id "$RT" --force --route-rules \
  "[{\"destination\":\"0.0.0.0/0\",\"destinationType\":\"CIDR_BLOCK\",\"networkEntityId\":\"$IGW\"}]" >/dev/null

echo "2/5 Puertos 22, 80 y 443…"
SL=$(oci network vcn get --vcn-id "$VCN" --query 'data."default-security-list-id"' --raw-output)
oci network security-list update --security-list-id "$SL" --force --ingress-security-rules '[
  {"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":22,"max":22}}},
  {"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":80,"max":80}}},
  {"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":443,"max":443}}},
  {"source":"0.0.0.0/0","protocol":"17","udpOptions":{"destinationPortRange":{"min":443,"max":443}}},
  {"source":"0.0.0.0/0","protocol":"1","icmpOptions":{"type":3,"code":4}}
]' >/dev/null

SUBNET=$(id_of oci network subnet list -c "$C" --vcn-id "$VCN")
if ! found "$SUBNET"; then
  SUBNET=$(oci network subnet create -c "$C" --vcn-id "$VCN" --cidr-block 10.0.0.0/24 \
    --display-name "$NAME" --dns-label web --wait-for-state AVAILABLE --query 'data.id' --raw-output)
fi

echo "3/5 Imagen de Ubuntu 24.04 para $SHAPE…"
AD=$(oci iam availability-domain list -c "$C" --query 'data[0].name' --raw-output)
IMAGE=$(id_of oci compute image list -c "$C" --operating-system 'Canonical Ubuntu' \
  --operating-system-version '24.04' --shape "$SHAPE" --sort-by TIMECREATED --sort-order DESC)
found "$IMAGE" || { echo "No hay imagen de Ubuntu 24.04 para $SHAPE" >&2; exit 1; }

echo "4/5 Máquina (tarda uno o dos minutos)…"
WORK=$(mktemp -d)
printf '%s\n' "$SSH_KEY" > "$WORK/key.pub"
curl -fsSL "$REPO_RAW/infra/oracle/cloud-init.yaml" -o "$WORK/cloud-init.yaml"

INSTANCE=$(id_of oci compute instance list -c "$C" --display-name "$NAME" --lifecycle-state RUNNING)
if ! found "$INSTANCE"; then
  SIZE=()
  # Solo las formas "Flex" dejan (y obligan a) decir cuánta CPU y memoria.
  case "$SHAPE" in *Flex) SIZE=(--shape-config '{"ocpus":1,"memoryInGBs":6}') ;; esac

  INSTANCE=$(oci compute instance launch -c "$C" --availability-domain "$AD" --shape "$SHAPE" \
    "${SIZE[@]}" --image-id "$IMAGE" --subnet-id "$SUBNET" --assign-public-ip true \
    --display-name "$NAME" --ssh-authorized-keys-file "$WORK/key.pub" \
    --user-data-file "$WORK/cloud-init.yaml" --wait-for-state RUNNING \
    --query 'data.id' --raw-output)
fi

echo "5/5 IP pública…"
IP=$(oci compute instance list-vnics --instance-id "$INSTANCE" --query 'data[0]."public-ip"' --raw-output)

echo
echo "Listo. La máquina está en:  $IP"
echo "Usuario SSH: ubuntu"
